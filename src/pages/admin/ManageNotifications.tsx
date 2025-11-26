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
import { Plus, Bell, AlertCircle, Info, CheckCircle, Loader2, Users, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  college_id?: number;
  created_by?: number;
  is_active: boolean;
  created_at: string;
  recipient_count?: number;
}

interface College {
  id: number;
  name: string;
  code: string;
}

export default function ManageNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "success" | "warning" | "error",
    // Targeting options
    college_id: "",
    department: "",
    section: "",
    present_year: "",
    user_ids: "" as string, // Comma-separated user IDs
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
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

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listNotifications({ limit: 1000 });
      setNotifications(response.notifications || []);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate at least one targeting option
    if (!formData.college_id && !formData.department && !formData.section && 
        !formData.present_year && !formData.user_ids.trim()) {
      toast({
        title: "Error",
        description: "Please specify at least one targeting option (College, Department, Section, Year, or User IDs)",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      
      const notificationData: any = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
      };
      
      // Add targeting options
      if (formData.college_id) {
        notificationData.college_id = parseInt(formData.college_id);
      }
      if (formData.department) {
        notificationData.department = formData.department;
      }
      if (formData.section) {
        notificationData.section = formData.section;
      }
      if (formData.present_year) {
        notificationData.present_year = formData.present_year;
      }
      if (formData.user_ids.trim()) {
        // Parse comma-separated user IDs
        const userIds = formData.user_ids
          .split(",")
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id));
        if (userIds.length > 0) {
          notificationData.user_ids = userIds;
        }
      }
      
      await apiClient.createNotification(notificationData);
      
      toast({
        title: "Success",
        description: "Notification sent successfully",
      });
      
      setOpen(false);
      setFormData({
        title: "",
        message: "",
        type: "info",
        college_id: "",
        department: "",
        section: "",
        present_year: "",
        user_ids: "",
      });
      fetchNotifications();
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const toggleActive = async (notification: Notification) => {
    try {
      await apiClient.toggleNotificationActive(notification.id);
      toast({
        title: "Success",
        description: `Notification ${notification.is_active ? "deactivated" : "activated"}`,
      });
      fetchNotifications();
    } catch (error: any) {
      console.error("Error toggling notification:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update notification",
        variant: "destructive",
      });
    }
  };

  const viewRecipients = async (notification: Notification) => {
    setSelectedNotification(notification);
    setRecipientsOpen(true);
    setLoadingRecipients(true);
    
    try {
      const data = await apiClient.getNotificationRecipients(notification.id);
      setRecipients(data || []);
    } catch (error: any) {
      console.error("Error fetching recipients:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load recipients",
        variant: "destructive",
      });
    } finally {
      setLoadingRecipients(false);
    }
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
          <h1 className="text-3xl font-bold text-foreground">Manage Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Send notifications to students with advanced targeting options
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Send Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send New Notification</DialogTitle>
              <DialogDescription>
                Create a notification and target specific students using the options below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Notification title"
                  required
                />
              </div>
              
              <div>
                <Label>Message *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  placeholder="Notification message"
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
                    Specify at least one targeting option to send the notification
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

                <div>
                  <Label>Specific User IDs</Label>
                  <Input
                    value={formData.user_ids}
                    onChange={(e) => setFormData({ ...formData, user_ids: e.target.value })}
                    placeholder="e.g., 1, 2, 3 (comma-separated, optional)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter comma-separated user IDs to target specific students
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={sending} className="flex-1">
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Notification"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
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
              <p className="text-muted-foreground">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No notifications yet. Send your first notification!</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card key={notification.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getIcon(notification.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{notification.title}</CardTitle>
                      <Badge variant={notification.is_active ? "default" : "secondary"}>
                        {notification.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{new Date(notification.created_at).toLocaleString()}</span>
                      {notification.recipient_count !== undefined && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {notification.recipient_count} recipients
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewRecipients(notification)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Recipients
                  </Button>
                  <Button
                    variant={notification.is_active ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleActive(notification)}
                  >
                    {notification.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Recipients Dialog */}
      <Dialog open={recipientsOpen} onOpenChange={setRecipientsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Recipients - {selectedNotification?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedNotification?.recipient_count || 0} students received this notification
            </DialogDescription>
          </DialogHeader>
          {loadingRecipients ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading recipients...</p>
            </div>
          ) : recipients.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recipients found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient) => (
                    <TableRow key={recipient.user_id}>
                      <TableCell>{recipient.full_name || "N/A"}</TableCell>
                      <TableCell>{recipient.email}</TableCell>
                      <TableCell>{recipient.roll_number || "N/A"}</TableCell>
                      <TableCell>{recipient.department || "N/A"}</TableCell>
                      <TableCell>{recipient.section || "N/A"}</TableCell>
                      <TableCell>{recipient.present_year || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={recipient.is_read ? "default" : "secondary"}>
                          {recipient.is_read ? "Read" : "Unread"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
