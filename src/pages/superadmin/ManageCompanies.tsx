import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, Upload, Plus, Trash2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
}

export default function ManageCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCompany, setNewCompany] = useState({ name: "", description: "", logo_url: "" });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCompanies(data || []);
    }
    setLoading(false);
  };

  const handleAddCompany = async () => {
    if (!newCompany.name.trim()) {
      toast({ title: "Error", description: "Company name is required", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("companies")
      .insert({
        name: newCompany.name,
        description: newCompany.description || null,
        logo_url: newCompany.logo_url || null,
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Company added successfully" });
      setNewCompany({ name: "", description: "", logo_url: "" });
      setIsDialogOpen(false);
      fetchCompanies();
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company? All associated materials will be deleted.")) {
      return;
    }

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Company deleted successfully" });
      fetchCompanies();
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile || !selectedCompany || !materialType) {
      toast({ title: "Error", description: "Please select company, material type, and file", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      // Parse Excel/CSV file on client side
      const arrayBuffer = await uploadFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        throw new Error('No data found in file');
      }

      // Send parsed data to edge function
      const { data, error } = await supabase.functions.invoke('upload-company-materials', {
        body: {
          companyId: selectedCompany,
          materialType: materialType,
          data: jsonData,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      toast({
        title: "Success",
        description: `Uploaded ${data.inserted} of ${data.total} records${data.errors ? ` (${data.errors.length} errors)` : ''}`,
      });

      setUploadFile(null);
      setSelectedCompany("");
      setMaterialType("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Upload failed',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = (type: string) => {
    let csvContent = "";
    
    switch (type) {
      case "quizzes":
        csvContent = "title,description,difficulty,duration_minutes,questions\n";
        csvContent += 'Sample Quiz,This is a sample quiz,Easy,30,"[{\\"question\\":\\"What is 2+2?\\",\\"options\\":[\\"3\\",\\"4\\",\\"5\\",\\"6\\"],\\"correct\\":\\"4\\"}]"\n';
        break;
      case "coding":
        csvContent = "title,description,difficulty,sample_input,sample_output,constraints,test_cases\n";
        csvContent += 'Two Sum,Find two numbers that add up to target,Easy,"[2,7,11,15], target=9","[0,1]","2 <= nums.length <= 10^4","[{\\"input\\":\\"[2,7,11,15], 9\\",\\"output\\":\\"[0,1]\\"}]"\n';
        break;
      case "gd":
        csvContent = "topic,description,key_points,dos_and_donts\n";
        csvContent += 'Climate Change,Discussion on global warming,"[\\"Rising temperatures\\",\\"Sea level rise\\"]","{\\"dos\\":[\\"Listen actively\\",\\"Respect opinions\\"],\\"donts\\":[\\"Interrupt others\\",\\"Be aggressive\\"]}"\n';
        break;
      case "interview":
        csvContent = "question,category,expected_answer,tips\n";
        csvContent += 'Tell me about yourself,Behavioral,Focus on relevant experience and skills,"[\\"Keep it under 2 minutes\\",\\"Focus on professional experience\\"]"\n';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading companies...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Companies</h1>
          <p className="text-muted-foreground mt-1">Add companies and upload placement training materials</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>Create a new company profile for placement training</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="e.g., Infosys, TCS, Wipro"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCompany.description}
                  onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                  placeholder="Brief description of the company"
                />
              </div>
              <div>
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  value={newCompany.logo_url}
                  onChange={(e) => setNewCompany({ ...newCompany, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <Button onClick={handleAddCompany} className="w-full">Add Company</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="companies" className="w-full">
        <TabsList>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="upload">Upload Materials</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card key={company.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="h-10 w-10 object-contain" />
                      ) : (
                        <Building2 className="h-10 w-10 text-primary" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {company.is_active ? "Active" : "Inactive"}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCompany(company.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {company.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{company.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Upload Training Materials
              </CardTitle>
              <CardDescription>
                Upload Excel/CSV files to add quizzes, coding problems, GD topics, or interview questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="company">Select Company</Label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger id="company">
                      <SelectValue placeholder="Choose a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="materialType">Material Type</Label>
                  <Select value={materialType} onValueChange={setMaterialType}>
                    <SelectTrigger id="materialType">
                      <SelectValue placeholder="Choose material type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quizzes">Quizzes</SelectItem>
                      <SelectItem value="coding">Coding Problems</SelectItem>
                      <SelectItem value="gd">GD Topics</SelectItem>
                      <SelectItem value="interview">Interview Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="file">Upload File (CSV/Excel)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleFileUpload}
                  disabled={!uploadFile || !selectedCompany || !materialType || uploading}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Materials"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => materialType && downloadTemplate(materialType)}
                  disabled={!materialType}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Excel Format Guide</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Use the first row for column headers</li>
                  <li>For JSON fields (questions, test_cases, etc.), use valid JSON strings</li>
                  <li>Download templates for correct format examples</li>
                  <li>Ensure all required fields are filled</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
