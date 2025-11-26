import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Download, FileText, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Certificate {
  id: number;
  user_id: number;
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
  user?: {
    id: number;
    email: string;
    full_name?: string;
  };
}

export default function ReviewCertificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | '10th' | 'intermediate' | 'college' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    fetchCertificates();
  }, [typeFilter]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (typeFilter !== 'all') filters.certificate_type = typeFilter;
      
      const data = await apiClient.getPendingCertificates(filters);
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

  const handleReview = (cert: Certificate) => {
    setSelectedCert(cert);
    setReviewStatus('approved');
    setReviewNotes('');
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!selectedCert) return;

    try {
      setReviewing(selectedCert.id);
      await apiClient.reviewCertificate(selectedCert.id, reviewStatus, reviewNotes || undefined);
      
      toast({
        title: "Success",
        description: `Certificate ${reviewStatus === 'approved' ? 'approved' : 'rejected'} successfully`,
      });
      
      setReviewOpen(false);
      setSelectedCert(null);
      setReviewNotes('');
      fetchCertificates();
    } catch (error: any) {
      console.error("Error reviewing certificate:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to review certificate",
        variant: "destructive",
      });
    } finally {
      setReviewing(null);
    }
  };

  const downloadFile = (cert: Certificate) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    window.open(`${apiBaseUrl}${cert.file_url}`, '_blank');
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = 
      cert.certificate_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Review Certificates</h1>
        <p className="text-muted-foreground mt-1">Review and approve student certificates</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by certificate name or student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
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

      {/* Certificates Table */}
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
            <p className="text-muted-foreground">No pending certificates</p>
            <p className="text-sm text-muted-foreground mt-2">
              All certificates have been reviewed
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Certificates ({filteredCertificates.length})</CardTitle>
            <CardDescription>Review and approve or reject student certificates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Issuing Authority</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cert.user?.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{cert.user?.email || 'N/A'}</p>
                        </div>
                      </TableCell>
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
                      <TableCell>
                        {new Date(cert.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => downloadFile(cert)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="default" size="sm" onClick={() => handleReview(cert)}>
                            Review
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

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Certificate</DialogTitle>
          </DialogHeader>
          {selectedCert && (
            <div className="space-y-4">
              <div>
                <Label>Certificate</Label>
                <p className="font-medium">{selectedCert.certificate_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedCert.certificate_type.charAt(0).toUpperCase() + selectedCert.certificate_type.slice(1)} Certificate
                </p>
              </div>

              <div>
                <Label>Student</Label>
                <p className="font-medium">{selectedCert.user?.full_name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{selectedCert.user?.email || 'N/A'}</p>
              </div>

              <div>
                <Label>Review Decision</Label>
                <Select value={reviewStatus} onValueChange={(value: any) => setReviewStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Review Notes (Optional)</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  placeholder="Add any notes or feedback for the student..."
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setReviewOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={submitReview} 
                  disabled={reviewing === selectedCert.id}
                  className="flex-1"
                >
                  {reviewing === selectedCert.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    reviewStatus === 'approved' ? 'Approve' : 'Reject'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

