import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, Loader2, Users } from "lucide-react";
import { apiClient } from "@/integrations/api/client";

export default function Promotions() {
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const { toast } = useToast();

  const handlePromoteAll = async () => {
    if (!confirm("Are you sure you want to promote ALL students to the next year? This action cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      const params = collegeId ? `?college_id=${collegeId}` : "";
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://72.60.101.14:8000/api/v1'}/promotion/all${params}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to promote students');
      }

      const result = await response.json();
      toast({
        title: "Success",
        description: `Successfully promoted ${result.promoted_count || 0} students`,
      });
      setSelectedYear("");
    } catch (error: any) {
      console.error("Error promoting students:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to promote students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteByYear = async () => {
    if (!selectedYear) {
      toast({
        title: "Error",
        description: "Please select a year",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to promote all ${selectedYear} year students to the next year? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const params = collegeId ? `?college_id=${collegeId}` : "";
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://72.60.101.14:8000/api/v1'}/promotion/year/${selectedYear}${params}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to promote students');
      }

      const result = await response.json();
      toast({
        title: "Success",
        description: `Successfully promoted ${result.promoted_count || 0} ${selectedYear} year students`,
      });
      setSelectedYear("");
    } catch (error: any) {
      console.error("Error promoting students:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to promote students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Year Promotion</h1>
        <p className="text-muted-foreground mt-1">
          Promote students to the next academic year (Super Admin only)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Promote All Students
            </CardTitle>
            <CardDescription>
              Promote all students across all colleges (or a specific college) to the next year
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>College (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Leave empty to promote all students across all colleges
              </p>
              <input
                type="number"
                placeholder="College ID (optional)"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={collegeId || ""}
                onChange={(e) => setCollegeId(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
            <Button
              onClick={handlePromoteAll}
              disabled={loading}
              className="w-full"
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Promote All Students
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5" />
              Promote by Year
            </CardTitle>
            <CardDescription>
              Promote all students from a specific year to the next year
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>From Year *</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st">1st Year → 2nd Year</SelectItem>
                  <SelectItem value="2nd">2nd Year → 3rd Year</SelectItem>
                  <SelectItem value="3rd">3rd Year → 4th Year</SelectItem>
                  <SelectItem value="4th">4th Year → 5th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>College (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Leave empty to promote students from all colleges
              </p>
              <input
                type="number"
                placeholder="College ID (optional)"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={collegeId || ""}
                onChange={(e) => setCollegeId(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
            <Button
              onClick={handlePromoteByYear}
              disabled={loading || !selectedYear}
              className="w-full"
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Promote {selectedYear} Year Students
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="text-yellow-800 dark:text-yellow-200">⚠️ Important Notice</CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-700 dark:text-yellow-300">
          <ul className="list-disc list-inside space-y-2">
            <li>Promotion actions cannot be undone</li>
            <li>All students will be moved to the next academic year</li>
            <li>Make sure you have backed up your data before proceeding</li>
            <li>This action affects student profiles, attendance records, and other year-dependent data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

