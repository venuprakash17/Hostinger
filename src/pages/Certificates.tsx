import { useState, useEffect } from "react";
import { Upload, FileText, CheckCircle2, XCircle, Clock, Download, Trash2, Edit2, Loader2 } from "lucide-react";
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

export default function Certificates() {
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
    
    if (!formData.file) {
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
        
        toast({
          title: "Success",
          description: "Certificate updated successfully",
        });
      } else {
        // Upload new certificate
        await apiClient.uploadCertificate(
          formData.file,
          formData.certificate_type,
          formData.certificate_name,
          formData.issuing_authority || undefined,
          formData.issue_date || undefined,
          formData.description || undefined,
          formData.grade_percentage || undefined
        );
        
        toast({
          title: "Success",
          description: "Certificate uploaded successfully. Waiting for admin review.",
        });
      }
      
      setOpen(false);
      setEditingCert(null);
      setFormData({
        certificate_type: '10th',
        certificate_name: '',
        issuing_authority: '',
        issue_date: '',
        description: '',
        grade_percentage: '',
        file: null
      });
      fetchCertificates();
    } catch (error: any) {
      console.error("Error uploading certificate:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload certificate",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this certificate? This action cannot be undone.")) {
      return;
    }

    try {
      await apiClient.deleteCertificate(id);
      toast({
        title: "Success",
        description: "Certificate deleted successfully",
      });
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

  const handleEdit = (cert: Certificate) => {
    if (cert.status !== 'pending') {
      toast({
        title: "Error",
        description: "You can only edit pending certificates",
        variant: "destructive",
      });
      return;
    }
    
    setEditingCert(cert);
    setFormData({
      certificate_type: cert.certificate_type,
      certificate_name: cert.certificate_name,
      issuing_authority: cert.issuing_authority || '',
      issue_date: cert.issue_date ? cert.issue_date.split('T')[0] : '',
      description: cert.description || '',
      grade_percentage: cert.grade_percentage || '',
      file: null
    });
    setOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success text-success-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  const downloadFile = (cert: Certificate) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://72.60.101.14:8000/api/v1';
    window.open(`${apiBaseUrl}${cert.file_url}`, '_blank');
  };

  const filteredCertificates = certificates;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Certificates</h1>
          <p className="text-muted-foreground mt-1">Upload and manage your certificates</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setEditingCert(null);
            setFormData({
              certificate_type: '10th',
              certificate_name: '',
              issuing_authority: '',
              issue_date: '',
              description: '',
              grade_percentage: '',
              file: null
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Certificate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCert ? 'Edit Certificate' : 'Upload New Certificate'}</DialogTitle>
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
                  placeholder="e.g., CBSE, State Board"
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
                  placeholder="e.g., 95%, A+"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Additional information about the certificate"
                />
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingCert ? 'Updating...' : 'Uploading...'}
                  </>
                ) : (
                  editingCert ? 'Update Certificate' : 'Upload Certificate'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-[200px]">
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
          <SelectTrigger className="w-[200px]">
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
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No certificates found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Upload your first certificate to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCertificates.map((cert) => (
            <Card key={cert.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{cert.certificate_name}</CardTitle>
                    <CardDescription className="mt-1">
                      {cert.certificate_type.charAt(0).toUpperCase() + cert.certificate_type.slice(1)} Certificate
                      {cert.issuing_authority && ` • ${cert.issuing_authority}`}
                      {cert.grade_percentage && ` • ${cert.grade_percentage}`}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(cert.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(cert.status)}
                      {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {cert.description && (
                  <p className="text-sm text-muted-foreground mb-4">{cert.description}</p>
                )}
                
                {cert.review_notes && (
                  <div className="mb-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">Review Notes:</p>
                    <p className="text-sm text-muted-foreground">{cert.review_notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadFile(cert)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  {cert.status === 'pending' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(cert)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(cert.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

