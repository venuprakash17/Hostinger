import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';

interface ExcelImportProps {
  onImport: (data: any[]) => Promise<void>;
  templateColumns: string[];
  title: string;
  description: string;
}

export function ExcelImport({ onImport, templateColumns, title, description }: ExcelImportProps) {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error("Excel file is empty");
        return;
      }

      await onImport(jsonData);
      toast.success(`Successfully imported ${jsonData.length} records`);
      event.target.value = ''; // Reset input
    } catch (error: any) {
      toast.error(error.message || "Failed to import data");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = templateColumns.reduce((acc, col) => {
      acc[col] = '';
      return acc;
    }, {} as Record<string, string>);

    const ws = XLSX.utils.json_to_sheet([template]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${title.toLowerCase().replace(/\s+/g, '_')}_template.xlsx`);
    toast.success("Template downloaded");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="excel-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                <Upload className="h-4 w-4" />
                <span className="text-sm">{loading ? "Uploading..." : "Upload Excel File"}</span>
              </div>
              <Input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
            </Label>
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Download the template to see the required format</p>
          <p>• Fill in the data and upload the Excel file</p>
          <p>• Supported formats: .xlsx, .xls</p>
        </div>
      </CardContent>
    </Card>
  );
}
