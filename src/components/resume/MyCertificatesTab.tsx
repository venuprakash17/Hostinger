import { useState, useEffect } from "react";
import { Upload, FileText, CheckCircle2, XCircle, Clock, Download, Trash2, Edit2, Loader2, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Certificate {
  id: number;
  certificate_type: '10th' | 'intermediate' | 'college' | 'other';
  certificate_name: string;
  issuing_authority?: string;
  issue_date?: string;
  file_url: string;
  file_name: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: number;
  reviewed_at?: string;
  review_notes?: string;
  description?: string;
  grade_percentage?: string;
  created_at: string;
}

export function MyCertificatesTab() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | '10th' | 'intermediate' | 'college' | 'other'>('all');
  
  const [formData, setFormData] = useState({
    certificate_type: '10th' as '10th' | 'intermediate' | 'college' | 'other',
    certificate_name: '',
    issuing_authority: '',
    issue_date: '',
    description: '',
    grade_percentage: '',
    file: null as File | null
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.certificate_type = typeFilter;
      
      const data = await apiClient.getMyCertificates(filters);
      setCertificates(data || []);
    } catch (error: any) {
      console.error("Error fetching certificates:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load certificates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [statusFilter, typeFilter]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCert && !formData.file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!formData.certificate_name.trim()) {
      toast({
        title: "Error",
        description: "Certificate name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      if (editingCert) {
        // Update existing certificate
        await apiClient.updateCertificate(editingCert.id, {
          certificate_name: formData.certificate_name,
          issuing_authority: formData.issuing_authority || undefined,
          issue_date: formData.issue_date || undefined,
          description: formData.description || undefined,
          grade_percentage: formData.grade_percentage || undefined,
        });
        toast({ title: "Success", description: "Certificate updated successfully" });
      } else {
        // Upload new certificate
        await apiClient.uploadCertificate(
          formData.file!,
          formData.certificate_type,
          formData.certificate_name,
          formData.issuing_authority || undefined,
          formData.issue_date || undefined,
          formData.description || undefined,
          formData.grade_percentage || undefined
        );
        toast({ title: "Success", description: "Certificate uploaded successfully" });
      }

      setOpen(false);
      setEditingCert(null);
      resetForm();
      fetchCertificates();
    } catch (error: any) {
      console.error("Error saving certificate:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save certificate",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (cert: Certificate) => {
    setEditingCert(cert);
    setFormData({
      certificate_type: cert.certificate_type,
      certificate_name: cert.certificate_name,
      issuing_authority: cert.issuing_authority || '',
      issue_date: cert.issue_date ? new Date(cert.issue_date).toISOString().split('T')[0] : '',
      description: cert.description || '',
      grade_percentage: cert.grade_percentage || '',
      file: null
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this certificate?")) return;

    try {
      await apiClient.deleteCertificate(id);
      toast({ title: "Success", description: "Certificate deleted successfully" });
      fetchCertificates();
    } catch (error: any) {
      console.error("Error deleting certificate:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete certificate",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      certificate_type: '10th',
      certificate_name: '',
      issuing_authority: '',
      issue_date: '',
      description: '',
      grade_percentage: '',
      file: null
    });
  };

  const downloadFile = (cert: Certificate) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://72.60.101.14:8000/api/v1';
    window.open(`${apiBaseUrl}${cert.file_url}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredCertificates = certificates;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">My Certificates</h2>
          <p className="text-muted-foreground mt-1">
            Upload and manage your certificates. Certificates will be reviewed by faculty/admins.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              setEditingCert(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Certificate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCert ? "Edit Certificate" : "Upload New Certificate"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Certificate Type *</Label>
                <Select 
                  value={formData.certificate_type} 
                  onValueChange={(value: any) => setFormData({ ...formData, certificate_type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10th">10th Standard</SelectItem>
                    <SelectItem value="intermediate">Intermediate (12th)</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Certificate Name *</Label>
                <Input
                  value={formData.certificate_name}
                  onChange={(e) => setFormData({ ...formData, certificate_name: e.target.value })}
                  placeholder="e.g., 10th Standard Marksheet"
                  required
                />
              </div>

              {!editingCert && (
                <div>
                  <Label>Certificate File *</Label>
                  <Input
                    type="file"
                    accept="*/*"
                    onChange={handleFileChange}
                    required={!editingCert}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    All file formats accepted (PDF, PNG, JPG, DOC, DOCX, etc.) - Max 10MB
                  </p>
                </div>
              )}

              <div>
                <Label>Issuing Authority</Label>
                <Input
                  value={formData.issuing_authority}
                  onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                  placeholder="e.g., CBSE, State Board, University Name"
                />
              </div>

              <div>
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Grade/Percentage</Label>
                <Input
                  value={formData.grade_percentage}
                  onChange={(e) => setFormData({ ...formData, grade_percentage: e.target.value })}
                  placeholder="e.g., 95%, A+, First Class"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Additional details about the certificate..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingCert ? "Updating..." : "Uploading..."}
                    </>
                  ) : (
                    editingCert ? "Update Certificate" : "Upload Certificate"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setEditingCert(null);
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

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="10th">10th Standard</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="college">College</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Certificates List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading certificates...</p>
          </CardContent>
        </Card>
      ) : filteredCertificates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No certificates found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Upload your first certificate to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>My Certificates ({filteredCertificates.length})</CardTitle>
            <CardDescription>Manage your uploaded certificates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Issuing Authority</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cert.certificate_name}</p>
                          {cert.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{cert.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {cert.certificate_type.charAt(0).toUpperCase() + cert.certificate_type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{cert.issuing_authority || 'N/A'}</TableCell>
                      <TableCell>{cert.grade_percentage || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(cert.status)}</TableCell>
                      <TableCell>
                        {new Date(cert.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => downloadFile(cert)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          {cert.status === 'pending' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(cert)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(cert.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      {/* Review Notes for Rejected Certificates */}
      {filteredCertificates.filter(c => c.status === 'rejected' && c.review_notes).length > 0 && (
        <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200">Review Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredCertificates
              .filter(c => c.status === 'rejected' && c.review_notes)
              .map((cert) => (
                <div key={cert.id} className="p-3 bg-white dark:bg-gray-900 rounded border">
                  <p className="font-medium text-sm">{cert.certificate_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{cert.review_notes}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

