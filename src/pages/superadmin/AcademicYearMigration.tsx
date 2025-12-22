import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Archive, Users, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { apiClient } from "@/integrations/api/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface College {
  id: number;
  name: string;
}

interface MigrationPreview {
  students_to_promote: number;
  sections_to_archive: number;
  subjects_to_archive: number;
  assignments_to_clear: number;
  promotion_breakdown: Array<{ from_year: string; to_year: string; count: number }>;
  sections_breakdown: Array<{ section: string; department: string; count: number }>;
}

interface Migration {
  id: number;
  from_academic_year_id: number | null;
  to_academic_year_id: number | null;
  college_id: number;
  migration_type: string;
  status: string;
  students_promoted: number;
  sections_archived: number;
  subjects_archived: number;
  assignments_cleared: number;
  initiated_by: number | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  can_rollback: boolean;
  created_at: string;
}

export default function AcademicYearMigration() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [migrations, setMigrations] = useState<Migration[]>([]);
  
  // Migration form state
  const [fromAcademicYearId, setFromAcademicYearId] = useState<number | null>(null);
  const [toAcademicYearId, setToAcademicYearId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // Promotion rules
  const [promotionRules, setPromotionRules] = useState([
    { from_year: "1st", to_year: "2nd" },
    { from_year: "2nd", to_year: "3rd" },
    { from_year: "3rd", to_year: "4th" },
    { from_year: "4th", to_year: "5th" },
  ]);
  
  const [archiveOptions, setArchiveOptions] = useState({
    archive_sections: true,
    archive_subjects: true,
    archive_assignments: true,
  });

  useEffect(() => {
    fetchAcademicYears();
    fetchColleges();
    fetchMigrations();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const years = await apiClient.getAcademicYears();
      setAcademicYears(years);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch academic years",
        variant: "destructive",
      });
    }
  };

  const fetchColleges = async () => {
    try {
      const collegesData = await apiClient.getColleges();
      setColleges(collegesData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch colleges",
        variant: "destructive",
      });
    }
  };

  const fetchMigrations = async () => {
    try {
      const migrationsData = await apiClient.getMigrations();
      setMigrations(migrationsData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch migrations",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async () => {
    if (!fromAcademicYearId || !toAcademicYearId || !collegeId) {
      toast({
        title: "Error",
        description: "Please select from year, to year, and college",
        variant: "destructive",
      });
      return;
    }

    try {
      setPreviewLoading(true);
      const previewData = await apiClient.previewMigration(
        fromAcademicYearId,
        toAcademicYearId,
        collegeId
      );
      setPreview(previewData);
      setPreviewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to preview migration",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePromoteStudents = async () => {
    if (!toAcademicYearId || !collegeId) {
      toast({
        title: "Error",
        description: "Please select to year and college",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to promote students? This action cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      const result = await apiClient.promoteStudents({
        academic_year_id: toAcademicYearId,
        college_id: collegeId,
        promotion_rules: promotionRules,
        auto_approve: true,
      });

      toast({
        title: "Success",
        description: `Successfully promoted ${result.promoted_count} students`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to promote students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveOldYear = async () => {
    if (!fromAcademicYearId || !toAcademicYearId || !collegeId) {
      toast({
        title: "Error",
        description: "Please select from year, to year, and college",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to archive the old academic year? This will archive sections, subjects, and assignments.")) {
      return;
    }

    try {
      setLoading(true);
      const result = await apiClient.archiveOldAcademicYear({
        from_academic_year_id: fromAcademicYearId,
        to_academic_year_id: toAcademicYearId,
        college_id: collegeId,
        ...archiveOptions,
      });

      toast({
        title: "Success",
        description: `Successfully archived old academic year. Archived ${result.sections_archived} sections, ${result.subjects_archived} subjects, and cleared ${result.assignments_cleared} assignments.`,
      });
      
      fetchMigrations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to archive old academic year",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "pending":
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAcademicYearName = (id: number | null) => {
    if (!id) return "N/A";
    const year = academicYears.find(y => y.id === id);
    return year?.name || `Year ${id}`;
  };

  const getCollegeName = (id: number) => {
    const college = colleges.find(c => c.id === id);
    return college?.name || `College ${id}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic Year Migration</h1>
          <p className="text-muted-foreground mt-1">
            Manage academic year transitions and archive old data
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Migration Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Migration Setup</CardTitle>
            <CardDescription>
              Configure and preview academic year migration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>From Academic Year</Label>
              <Select
                value={fromAcademicYearId?.toString() || ""}
                onValueChange={(value) => setFromAcademicYearId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.name} {year.is_current && "(Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To Academic Year</Label>
              <Select
                value={toAcademicYearId?.toString() || ""}
                onValueChange={(value) => setToAcademicYearId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.name} {year.is_current && "(Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>College</Label>
              <Select
                value={collegeId?.toString() || ""}
                onValueChange={(value) => setCollegeId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select college" />
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

            <Button
              onClick={handlePreview}
              disabled={previewLoading || !fromAcademicYearId || !toAcademicYearId || !collegeId}
              className="w-full"
            >
              {previewLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading Preview...
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Preview Migration
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Promotion Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Promotion Rules</CardTitle>
            <CardDescription>
              Define how students will be promoted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {promotionRules.map((rule, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={rule.from_year}
                  onChange={(e) => {
                    const newRules = [...promotionRules];
                    newRules[index].from_year = e.target.value;
                    setPromotionRules(newRules);
                  }}
                  className="flex-1"
                  placeholder="From Year"
                />
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={rule.to_year}
                  onChange={(e) => {
                    const newRules = [...promotionRules];
                    newRules[index].to_year = e.target.value;
                    setPromotionRules(newRules);
                  }}
                  className="flex-1"
                  placeholder="To Year"
                />
              </div>
            ))}

            <Button
              onClick={handlePromoteStudents}
              disabled={loading || !toAcademicYearId || !collegeId}
              className="w-full"
              variant="outline"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Promote Students
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Archive Options */}
        <Card>
          <CardHeader>
            <CardTitle>Archive Options</CardTitle>
            <CardDescription>
              Select what to archive from the old academic year
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="archive_sections"
                checked={archiveOptions.archive_sections}
                onChange={(e) =>
                  setArchiveOptions({ ...archiveOptions, archive_sections: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="archive_sections">Archive Sections</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="archive_subjects"
                checked={archiveOptions.archive_subjects}
                onChange={(e) =>
                  setArchiveOptions({ ...archiveOptions, archive_subjects: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="archive_subjects">Archive Subjects</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="archive_assignments"
                checked={archiveOptions.archive_assignments}
                onChange={(e) =>
                  setArchiveOptions({ ...archiveOptions, archive_assignments: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="archive_assignments">Archive Assignments</Label>
            </div>

            <Button
              onClick={handleArchiveOldYear}
              disabled={loading || !fromAcademicYearId || !toAcademicYearId || !collegeId}
              className="w-full"
              variant="destructive"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Old Academic Year
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Migration History */}
      <Card>
        <CardHeader>
          <CardTitle>Migration History</CardTitle>
          <CardDescription>
            View all academic year migrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>From Year</TableHead>
                <TableHead>To Year</TableHead>
                <TableHead>College</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Students Promoted</TableHead>
                <TableHead>Archived</TableHead>
                <TableHead>Completed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {migrations.map((migration) => (
                <TableRow key={migration.id}>
                  <TableCell>{migration.id}</TableCell>
                  <TableCell>{getAcademicYearName(migration.from_academic_year_id)}</TableCell>
                  <TableCell>{getAcademicYearName(migration.to_academic_year_id)}</TableCell>
                  <TableCell>{getCollegeName(migration.college_id)}</TableCell>
                  <TableCell>{getStatusBadge(migration.status)}</TableCell>
                  <TableCell>{migration.students_promoted}</TableCell>
                  <TableCell>
                    {migration.sections_archived} sections, {migration.subjects_archived} subjects, {migration.assignments_cleared} assignments
                  </TableCell>
                  <TableCell>
                    {migration.completed_at
                      ? new Date(migration.completed_at).toLocaleString()
                      : "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Migration Preview</DialogTitle>
            <DialogDescription>
              Review the impact of this migration before executing
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{preview.students_to_promote}</p>
                    <p className="text-sm text-muted-foreground">Will be promoted</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{preview.sections_to_archive}</p>
                    <p className="text-sm text-muted-foreground">Will be archived</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Subjects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{preview.subjects_to_archive}</p>
                    <p className="text-sm text-muted-foreground">Will be archived</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{preview.assignments_to_clear}</p>
                    <p className="text-sm text-muted-foreground">Will be cleared</p>
                  </CardContent>
                </Card>
              </div>

              {preview.promotion_breakdown.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Promotion Breakdown</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>From Year</TableHead>
                        <TableHead>To Year</TableHead>
                        <TableHead>Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.promotion_breakdown.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.from_year}</TableCell>
                          <TableCell>{item.to_year}</TableCell>
                          <TableCell>{item.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

