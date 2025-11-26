import { useState, useEffect } from "react";
import { ArrowUp, CheckCircle2, XCircle, Clock, DollarSign, Loader2, Search } from "lucide-react";
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

interface PromotionRequest {
  id: number;
  user_id: number;
  from_year: string;
  to_year: string;
  fee_paid: boolean;
  fee_amount?: number;
  payment_reference?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  promoted_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  user?: {
    id: number;
    email: string;
    full_name?: string;
  };
}

export default function ReviewPromotions() {
  const [requests, setRequests] = useState<PromotionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PromotionRequest | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPendingPromotionRequests();
      setRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching promotion requests:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load promotion requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (request: PromotionRequest) => {
    setSelectedRequest(request);
    setReviewStatus('approved');
    setReviewNotes('');
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!selectedRequest) return;

    try {
      await apiClient.approvePromotion(selectedRequest.id, {
        status: reviewStatus,
        notes: reviewNotes || undefined,
      });

      toast({
        title: "Success",
        description: `Promotion request ${reviewStatus === 'approved' ? 'approved' : 'rejected'} successfully`,
      });

      setReviewOpen(false);
      setSelectedRequest(null);
      setReviewNotes('');
      fetchRequests();
    } catch (error: any) {
      console.error("Error reviewing promotion:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to review promotion request",
        variant: "destructive",
      });
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.from_year.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.to_year.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Review Year Promotions</h1>
        <p className="text-muted-foreground mt-1">Review and approve student promotion requests</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by student name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Requests Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading requests...</p>
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowUp className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No pending promotion requests</p>
            <p className="text-sm text-muted-foreground mt-2">
              All promotion requests have been reviewed
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Promotion Requests ({filteredRequests.length})</CardTitle>
            <CardDescription>Review and approve or reject student promotion requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Promotion</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.user?.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{request.user?.email || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {request.from_year.charAt(0).toUpperCase() + request.from_year.slice(1)} → {request.to_year.charAt(0).toUpperCase() + request.to_year.slice(1)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.fee_amount ? `₹${request.fee_amount}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={request.fee_paid ? "default" : "outline"}>
                          {request.fee_paid ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="default" size="sm" onClick={() => handleReview(request)}>
                          Review
                        </Button>
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
            <DialogTitle>Review Promotion Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <p className="font-medium">{selectedRequest.user?.full_name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.user?.email || 'N/A'}</p>
              </div>

              <div>
                <Label>Promotion</Label>
                <p className="font-medium">
                  {selectedRequest.from_year.charAt(0).toUpperCase() + selectedRequest.from_year.slice(1)} → {selectedRequest.to_year.charAt(0).toUpperCase() + selectedRequest.to_year.slice(1)} Year
                </p>
              </div>

              {selectedRequest.fee_amount && (
                <div>
                  <Label>Fee Information</Label>
                  <p className="text-sm">
                    Amount: ₹{selectedRequest.fee_amount}
                    {selectedRequest.fee_paid ? (
                      <span className="text-success ml-2">(Paid)</span>
                    ) : (
                      <span className="text-warning ml-2">(Not Paid)</span>
                    )}
                  </p>
                  {selectedRequest.payment_reference && (
                    <p className="text-sm text-muted-foreground">
                      Reference: {selectedRequest.payment_reference}
                    </p>
                  )}
                </div>
              )}

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
                  placeholder="Add any notes or feedback..."
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setReviewOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={submitReview} className="flex-1">
                  {reviewStatus === 'approved' ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

