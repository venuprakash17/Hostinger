import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Certification } from "@/hooks/useStudentProfile";
import { useToast } from "@/hooks/use-toast";
import { resumeStorage } from "@/lib/resumeStorage";

interface CertificationsFormProps {
  certifications: Certification[];
}

export function CertificationsForm({ certifications }: CertificationsFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<Certification>();
  const formValues = watch();

  // Load draft from localStorage when form opens
  useEffect(() => {
    if (isAdding && !editingId) {
      const draft = resumeStorage.load<Certification>('certifications_form');
      if (draft) {
        reset({
          ...draft,
          date_issued: draft.date_issued ? draft.date_issued.substring(0, 7) : undefined,
        });
        toast({
          title: "Draft restored",
          description: "Your previous form data has been restored.",
        });
      }
    }
  }, [isAdding, editingId, reset, toast]);

  // Auto-save draft to localStorage as user types (debounced)
  useEffect(() => {
    if (!isAdding || editingId) return;
    
    const timer = setTimeout(() => {
      const hasData = Object.values(formValues).some(val => 
        val !== '' && val !== null && val !== undefined
      );
      if (hasData) {
        resumeStorage.save('certifications_form', formValues);
      }
    }, 1000); // Save after 1 second of no typing

    return () => clearTimeout(timer);
  }, [formValues, isAdding, editingId]);

  const onSubmit = async (data: Certification) => {
    try {
      // Clear draft after successful save
      resumeStorage.clear('certifications_form');

      const certData: Certification = {
        ...data,
        id: editingId || `cert_${Date.now()}`,
        date_issued: data.date_issued ? `${data.date_issued}-01` : null,
      };

      // Save to localStorage
      const savedCerts = resumeStorage.load<Certification[]>('certifications_saved') || [];
      if (editingId) {
        const index = savedCerts.findIndex((c: any) => c.id === editingId);
        if (index >= 0) {
          savedCerts[index] = certData;
        } else {
          savedCerts.push(certData);
        }
        toast({ title: "Certification updated successfully" });
        setEditingId(null);
      } else {
        savedCerts.push(certData);
        toast({ title: "Certification added successfully" });
      }
      
      resumeStorage.save('certifications_saved', savedCerts);

      reset();
      setIsAdding(false);
      
      // Trigger page refresh to show updated list
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error saving certification",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (cert: Certification) => {
    setEditingId(cert.id!);
    reset({
      ...cert,
      date_issued: cert.date_issued ? cert.date_issued.substring(0, 7) : undefined,
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const savedCerts = resumeStorage.load<Certification[]>('certifications_saved') || [];
      const filtered = savedCerts.filter((c: any) => c.id !== id);
      resumeStorage.save('certifications_saved', filtered);
      
      toast({ title: "Certification deleted successfully" });
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error deleting certification",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    // Clear draft when canceling
    resumeStorage.clear('certifications_form');
    reset();
  };

  // Merge saved certifications from localStorage with props
  const savedCerts = resumeStorage.load<Certification[]>('certifications_saved') || [];
  const allCerts = [...certifications, ...savedCerts.filter((c: any) => 
    !certifications.find((cert: any) => cert.id === c.id)
  )];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Certifications</CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Certification
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing certifications */}
        {allCerts.map((cert) => (
          <div key={cert.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold">{cert.certification_name}</h4>
                <p className="text-sm text-muted-foreground">{cert.issuing_organization}</p>
                {cert.date_issued && (
                  <p className="text-sm text-muted-foreground">Issued: {cert.date_issued.substring(0, 7)}</p>
                )}
                {cert.credential_url && (
                  <a
                    href={cert.credential_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-block mt-1"
                  >
                    View Credential →
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(cert)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(cert.id!)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Add/Edit form */}
        {isAdding && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">
                {editingId ? "Edit Certification" : "Add New Certification"}
              </h4>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="certification_name">Certification Name *</Label>
                <Input
                  id="certification_name"
                  {...register("certification_name", { required: "Certification name is required" })}
                  placeholder="e.g., AWS Certified Solutions Architect, Google Cloud Professional, PMP Certification"
                />
                {errors.certification_name && (
                  <p className="text-sm text-destructive">{errors.certification_name.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="issuing_organization">Issuing Organization *</Label>
                <Input
                  id="issuing_organization"
                  {...register("issuing_organization", { required: "Issuing organization is required" })}
                  placeholder="e.g., Amazon Web Services, Google Cloud, Microsoft, PMI"
                />
                {errors.issuing_organization && (
                  <p className="text-sm text-destructive">{errors.issuing_organization.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_issued">Date Issued</Label>
                <Input
                  id="date_issued"
                  type="month"
                  {...register("date_issued")}
                />
                <p className="text-xs text-muted-foreground">Optional: When you received this certification</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credential_url">Credential URL</Label>
                <Input
                  id="credential_url"
                  type="url"
                  {...register("credential_url")}
                  placeholder="e.g., https://www.credly.com/badges/abc123 or https://aws.amazon.com/verification"
                />
                <p className="text-xs text-muted-foreground">Optional: Link to verify your certification online</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update Certification" : "Add Certification"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
