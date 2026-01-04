import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, File, X, CheckCircle2, XCircle, Download, AlertCircle, Loader2, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  endpoint: string;
  accept: string; // e.g., ".csv,.xlsx,.xls" or ".json"
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  label?: string;
  description?: string;
  templateUrl?: string;
  templateFileName?: string;
  disabled?: boolean;
  queryParams?: Record<string, string | number>; // Query parameters to append to the endpoint
}

export function FileUpload({
  endpoint,
  accept,
  onSuccess,
  onError,
  label = "Upload File",
  description,
  templateUrl,
  templateFileName,
  disabled = false,
  queryParams
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateFile = (selectedFile: File): boolean => {
    // Check file extension
    const fileExt = selectedFile.name.toLowerCase().split('.').pop();
    const allowedExts = accept.split(',').map(ext => ext.trim().replace('.', ''));
    
    if (!fileExt || !allowedExts.some(ext => fileExt === ext.toLowerCase())) {
      const errorMsg = `Invalid file type. Allowed types: ${accept}`;
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      const errorMsg = `File size exceeds 10MB limit. Current size: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`;
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setResult(null);
        setError(null);
      } else {
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        setResult(null);
        setError(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (!validateFile(file)) {
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem('access_token');
      
      // Use the same base URL logic as the API client to handle dev mode correctly
      const getApiBaseUrl = () => {
        const envUrl = import.meta.env.VITE_API_BASE_URL;
        // In development, always use localhost if production URL is detected
        if (import.meta.env.DEV && envUrl && envUrl.includes('72.60.101.14')) {
          return 'http://localhost:8000/api/v1';
        }
        return envUrl || 'http://localhost:8000/api/v1';
      };
      
      const apiBaseUrl = getApiBaseUrl();
      
      // Build URL with query parameters if provided
      let url = `${apiBaseUrl}${endpoint}`;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          params.append(key, String(value));
        });
        url = `${url}?${params.toString()}`;
      }
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 200);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: abortControllerRef.current.signal
      });

      clearInterval(progressInterval);
      setProgress(95);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        const errorMessage = errorData.detail || errorData.message || `Upload failed: ${response.statusText}`;
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setResult(data);
      setProgress(100);
      
      // Show success message with details
      const successMessage = data.message || 
        `Upload completed! ${data.success_count || 0} successful, ${data.failed_count || 0} failed`;
      toast.success(successMessage);
      
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      
      if (error.name === 'AbortError') {
        setError('Upload cancelled');
        toast.info('Upload cancelled');
      } else {
        const errorMessage = error.message || "Upload failed";
        setError(errorMessage);
        toast.error(errorMessage);
        if (onError) {
          onError(error);
        }
      }
      setProgress(0);
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setUploading(false);
    setProgress(0);
  };

  const handleDownloadTemplate = async (format: 'csv' | 'xlsx' = 'xlsx') => {
    if (!templateUrl) return;

    try {
      const token = localStorage.getItem('access_token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      
      // Add format query param for templates that support it
      const separator = templateUrl.includes('?') ? '&' : '?';
      let url = `${apiBaseUrl}${templateUrl}`;
      
      // Add format parameter for templates that support it (students, staff, hod-faculty)
      // Always add format parameter when xlsx is requested
      if (format === 'xlsx') {
        url = `${url}${separator}format=xlsx`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      const blob = await response.blob();
      const url_obj = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url_obj;
      
      // Determine filename based on format
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      const baseName = templateFileName?.replace(/\.(csv|xlsx)$/, '') || 'template';
      a.download = `${baseName}.${ext}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url_obj);
      document.body.removeChild(a);
      
      toast.success(`${format.toUpperCase()} template downloaded`);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || "Failed to download template");
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 px-4 sm:px-6">
        {label && <CardTitle className="text-base sm:text-lg">{label}</CardTitle>}
        {description && (
          <CardDescription className="text-xs sm:text-sm mt-1 leading-relaxed">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {/* Template Download Buttons */}
        {templateUrl && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center pb-3 sm:pb-2 border-b">
            {accept.includes('xlsx') || accept.includes('xls') ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => handleDownloadTemplate('xlsx')}
                disabled={uploading || disabled}
                className="bg-primary hover:bg-primary/90 w-full sm:w-auto justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Download Excel Template</span>
                <span className="sm:hidden">Excel Template</span>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate('csv')}
              disabled={uploading || disabled}
              className="w-full sm:w-auto justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Download CSV Template</span>
                <span className="sm:hidden">CSV Template</span>
            </Button>
          </div>
        )}

        {/* File Input Area with Drag & Drop */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 sm:p-6 transition-colors",
            isDragOver && "border-primary bg-primary/5",
            !isDragOver && "border-muted-foreground/25",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
            <div className="flex flex-col items-center space-y-2">
              <Upload className={cn(
                "h-8 w-8 sm:h-10 sm:w-10",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )} />
              <div className="text-center px-2">
                <p className="text-xs sm:text-sm font-medium break-words max-w-full">
                  {file ? (
                    <span className="truncate block max-w-[200px] sm:max-w-none" title={file.name}>
                      {file.name}
                    </span>
                  ) : (
                    "Drag & drop your file here"
                  )}
                </p>
                {!file && (
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
              <Input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                disabled={uploading || disabled}
                className="cursor-pointer file:mr-2 sm:file:mr-4 file:py-2 file:px-2 sm:file:px-4 file:rounded-md file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 w-full"
              />
              {file && !uploading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={uploading || disabled}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                >
                  <X className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Remove</span>
                </Button>
              )}
            </div>

            {file && (
              <div className="flex items-center gap-2 w-full justify-center flex-wrap px-2">
                <FileCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate max-w-[150px] sm:max-w-none" title={file.name}>
                  {file.name}
                </span>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {(file.size / 1024).toFixed(2)} KB
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="text-xs sm:text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleUpload}
            disabled={!file || uploading || disabled}
            className="flex-1 w-full sm:w-auto min-h-[44px] sm:min-h-0"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Uploading...</span>
                <span className="sm:hidden">Uploading</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">Upload</span>
              </>
            )}
          </Button>
          {uploading && (
            <Button
              variant="outline"
              onClick={handleCancel}
              size="lg"
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Results Summary */}
        {result && (
          <div className="space-y-3 p-3 sm:p-4 bg-muted rounded-lg border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              {result.success_count > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                    {result.success_count} successful
                  </span>
                </div>
              )}
              {result.failed_count > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">
                    {result.failed_count} failed
                  </span>
                </div>
              )}
            </div>
            
            {result.failed && result.failed.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs sm:text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>Failed Items (showing first 10):</span>
                </p>
                <div className="max-h-32 sm:max-h-48 overflow-y-auto space-y-1 bg-background p-2 rounded text-xs">
                  {result.failed.slice(0, 10).map((item: any, idx: number) => (
                    <div key={idx} className="text-red-600 dark:text-red-400 py-1 px-2 rounded hover:bg-red-50 dark:hover:bg-red-950/20 break-words">
                      <span className="font-medium">Row {item.row || item.index || idx + 1}:</span> {item.error}
                    </div>
                  ))}
                  {result.failed.length > 10 && (
                    <p className="text-muted-foreground pt-2 text-center text-xs">
                      ... and {result.failed.length - 10} more errors
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

