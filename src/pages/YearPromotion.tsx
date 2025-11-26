import { useState, useEffect } from "react";
import { ArrowUp, Clock, CheckCircle2, XCircle, Loader2, DollarSign } from "lucide-react";
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

interface PromotionRequest {
  id: number;
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
}

export default function YearPromotion() {
  const [requests, setRequests] = useState<PromotionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState<string>('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    from_year: '1st' as '1st' | '2nd' | '3rd' | '4th',
    to_year: '2nd' as '2nd' | '3rd' | '4th' | '5th',
    fee_amount: '',
    payment_reference: '',
    notes: '',
  });

  useEffect(() => {
    fetchRequests();
    fetchCurrentYear();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getMyPromotionRequests();
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

  const fetchCurrentYear = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      if (profile?.present_year) {
        setCurrentYear(profile.present_year);
        setFormData(prev => ({
          ...prev,
          from_year: profile.present_year as '1st' | '2nd' | '3rd' | '4th',
          to_year: getNextYear(profile.present_year) as '2nd' | '3rd' | '4th' | '5th',
        }));
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const getNextYear = (year: string): string => {
    const yearMap: Record<string, string> = {
      '1st': '2nd',
      '2nd': '3rd',
      '3rd': '4th',
      '4th': '5th',
    };
    return yearMap[year] || '2nd';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.from_year || !formData.to_year) {
      toast({
        title: "Error",
        description: "Please select from and to years",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.requestPromotion({
        from_year: formData.from_year,
        to_year: formData.to_year,
        fee_amount: formData.fee_amount ? parseFloat(formData.fee_amount) : undefined,
        payment_reference: formData.payment_reference || undefined,
        notes: formData.notes || undefined,
      });

      toast({
        title: "Success",
        description: "Promotion request submitted successfully. Waiting for admin approval.",
      });

      setOpen(false);
      setFormData({
        from_year: '1st',
        to_year: '2nd',
        fee_amount: '',
        payment_reference: '',
        notes: '',
      });
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit promotion request",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success text-success-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      case 'completed': return 'bg-blue-500 text-white';
      case 'pending': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Year Promotion</h1>
          <p className="text-muted-foreground mt-1">Request promotion to the next academic year</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <ArrowUp className="mr-2 h-4 w-4" />
              Request Promotion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Year Promotion</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>From Year *</Label>
                <Select 
                  value={formData.from_year} 
                  onValueChange={(value: any) => {
                    setFormData({ 
                      ...formData, 
                      from_year: value,
                      to_year: getNextYear(value) as '2nd' | '3rd' | '4th' | '5th'
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Year</SelectItem>
                    <SelectItem value="2nd">2nd Year</SelectItem>
                    <SelectItem value="3rd">3rd Year</SelectItem>
                    <SelectItem value="4th">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>To Year *</Label>
                <Select 
                  value={formData.to_year} 
                  onValueChange={(value: any) => setFormData({ ...formData, to_year: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2nd">2nd Year</SelectItem>
                    <SelectItem value="3rd">3rd Year</SelectItem>
                    <SelectItem value="4th">4th Year</SelectItem>
                    <SelectItem value="5th">5th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fee Amount (if applicable)</Label>
                <Input
                  type="number"
                  value={formData.fee_amount}
                  onChange={(e) => setFormData({ ...formData, fee_amount: e.target.value })}
                  placeholder="Enter fee amount"
                  step="0.01"
                />
              </div>

              <div>
                <Label>Payment Reference (if fee paid)</Label>
                <Input
                  value={formData.payment_reference}
                  onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                  placeholder="Transaction ID or reference number"
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional information"
                />
              </div>

              <Button type="submit" className="w-full">Submit Request</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Requests List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading requests...</p>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowUp className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No promotion requests</p>
            <p className="text-sm text-muted-foreground mt-2">
              Submit a request to be promoted to the next year
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {request.from_year.charAt(0).toUpperCase() + request.from_year.slice(1)} → {request.to_year.charAt(0).toUpperCase() + request.to_year.slice(1)} Year
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Requested on {new Date(request.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(request.status)}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {request.fee_amount && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Fee: ₹{request.fee_amount}
                        {request.fee_paid && <span className="text-success ml-2">(Paid)</span>}
                      </span>
                    </div>
                  )}
                  {request.payment_reference && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Payment Ref: </span>
                      <span>{request.payment_reference}</span>
                    </div>
                  )}
                </div>

                {request.notes && (
                  <p className="text-sm text-muted-foreground mb-4">{request.notes}</p>
                )}

                {request.rejection_reason && (
                  <div className="mb-4 p-3 bg-destructive/10 rounded-md">
                    <p className="text-sm font-medium text-destructive mb-1">Rejection Reason:</p>
                    <p className="text-sm text-destructive">{request.rejection_reason}</p>
                  </div>
                )}

                {request.promoted_at && (
                  <p className="text-sm text-muted-foreground">
                    Promoted on {new Date(request.promoted_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

