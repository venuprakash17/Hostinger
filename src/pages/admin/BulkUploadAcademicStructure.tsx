import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, CheckCircle2, XCircle, FileSpreadsheet } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { apiClient } from "@/integrations/api/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";

interface AcademicYear {
  id: number;
  name: string;
  is_current: boolean;
}

interface College {
  id: number;
  name: string;
}

export default function BulkUploadAcademicStructure() {
  const { toast } = useToast();
  const { isSuperAdmin, isAdmin, isHOD } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null);
  const [createSubjectsIfMissing, setCreateSubjectsIfMissing] = useState(true);
  const [createSectionsIfMissing, setCreateSectionsIfMissing] = useState(true);
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    fetchAcademicYears();
    if (isSuperAdmin) {
      fetchColleges();
    } else {
      // For admin/HOD, get college from profile
      fetchUserCollege();
    }
  }, [isSuperAdmin]);

  const fetchAcademicYears = async () => {
    try {
      const years = await apiClient.getAcademicYears();
      setAcademicYears(years);
      // Auto-select current academic year
      const currentYear = years.find((y: AcademicYear) => y.is_current);
      if (currentYear) {
        setSelectedAcademicYearId(currentYear.id);
      }
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

  const fetchUserCollege = async () => {
    try {
      // Get college from user profile
      const profile = await apiClient.getUserProfile();
      if (profile?.college_id) {
        setSelectedCollegeId(profile.college_id);
      }
    } catch (error: any) {
      console.error("Failed to fetch user college:", error);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedAcademicYearId) {
      toast({
        title: "Error",
        description: "Please select an academic year",
        variant: "destructive",
      });
      return;
    }

    if (isSuperAdmin && !selectedCollegeId) {
      toast({
        title: "Error",
        description: "Please select a college",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setUploadResult(null);

      const result = await apiClient.bulkUploadAcademicStructure(
        file,
        selectedAcademicYearId,
        selectedCollegeId || undefined,
        createSubjectsIfMissing,
        createSectionsIfMissing
      );

      setUploadResult(result);
      toast({
        title: "Success",
        description: `Upload completed! ${result.successful} rows processed successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload academic structure",
        variant: "destructive",
      });
      setUploadResult(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template
    const headers = [
      "Subject Name",
      "Subject Code",
      "Department Code",
      "Year",
      "Semester",
      "Section",
      "Faculty Email",
      "Faculty Staff ID",
      "Academic Year"
    ];

    const sampleRows = [
      [
        "Data Structures",
        "CS301",
        "CSE",
        "2nd",
        "Semester 3",
        "A",
        "faculty1@college.edu",
        "FAC001",
        "2025-2026"
      ],
      [
        "Database Systems",
        "CS302",
        "CSE",
        "2nd",
        "Semester 3",
        "B",
        "faculty2@college.edu",
        "FAC002",
        "2025-2026"
      ],
      [
        "Operating Systems",
        "CS401",
        "CSE",
        "3rd",
        "Semester 5",
        "A",
        "faculty1@college.edu",
        "FAC001",
        "2025-2026"
      ]
    ];

    const csvContent = [
      headers.join(","),
      ...sampleRows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "academic_structure_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bulk Upload Academic Structure</h1>
          <p className="text-muted-foreground mt-1">
            Upload subjects with faculty assignments in one go
          </p>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Configuration</CardTitle>
            <CardDescription>
              Configure upload settings before uploading your file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select
                value={selectedAcademicYearId?.toString() || ""}
                onValueChange={(value) => setSelectedAcademicYearId(parseInt(value))}
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

            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>College</Label>
                <Select
                  value={selectedCollegeId?.toString() || ""}
                  onValueChange={(value) => setSelectedCollegeId(parseInt(value))}
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
            )}

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="create_subjects"
                  checked={createSubjectsIfMissing}
                  onChange={(e) => setCreateSubjectsIfMissing(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="create_subjects">Create subjects if missing</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="create_sections"
                  checked={createSectionsIfMissing}
                  onChange={(e) => setCreateSectionsIfMissing(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="create_sections">Create sections if missing</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Upload CSV or Excel file with academic structure data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFileSelect={handleFileUpload}
              accept=".csv,.xlsx,.xls"
              disabled={loading || !selectedAcademicYearId || (isSuperAdmin && !selectedCollegeId)}
            />
            {loading && (
              <div className="mt-4 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2">Uploading and processing...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
            <CardDescription>
              Summary of the upload operation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{uploadResult.total_rows}</p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{uploadResult.successful}</p>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{uploadResult.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {uploadResult.created_subjects || 0}
                </p>
                <p className="text-sm text-muted-foreground">Subjects Created</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">
                  {uploadResult.created_sections || 0}
                </p>
                <p className="text-sm text-muted-foreground">Sections Created</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">
                  {uploadResult.created_assignments || 0}
                </p>
                <p className="text-sm text-muted-foreground">Assignments Created</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">
                  {uploadResult.created_faculty_section_assignments || 0}
                </p>
                <p className="text-sm text-muted-foreground">Faculty-Section Links</p>
              </div>
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Errors ({uploadResult.errors.length})</h3>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {uploadResult.errors.slice(0, 20).map((error: any, index: number) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Row {error.row}:</span> {error.error}
                      </div>
                    </div>
                  ))}
                  {uploadResult.errors.length > 20 && (
                    <p className="text-sm text-muted-foreground">
                      ... and {uploadResult.errors.length - 20} more errors
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>File Format Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Required Columns:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Subject Name:</strong> Name of the subject (e.g., "Data Structures")</li>
              <li><strong>Subject Code:</strong> Optional subject code (e.g., "CS301")</li>
              <li><strong>Department Code:</strong> Department code (e.g., "CSE", "ECE")</li>
              <li><strong>Year:</strong> Academic year (e.g., "1st", "2nd", "3rd", "4th")</li>
              <li><strong>Semester:</strong> Semester name or number (e.g., "Semester 3")</li>
              <li><strong>Section:</strong> Section name (e.g., "A", "B", "C")</li>
              <li><strong>Faculty Email:</strong> Faculty email address (or use Faculty Staff ID)</li>
              <li><strong>Faculty Staff ID:</strong> Faculty staff ID (or use Faculty Email)</li>
              <li><strong>Academic Year:</strong> Optional academic year name</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">What This Upload Does:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Creates or finds subjects based on name/code</li>
              <li>Creates or finds sections based on department, year, and semester</li>
              <li>Creates subject assignments linking faculty to subjects and sections</li>
              <li>Creates faculty-section assignments for student management</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

