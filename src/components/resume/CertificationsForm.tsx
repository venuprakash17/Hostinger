import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Certification } from "@/hooks/useStudentProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CertificationsFormProps {
  certifications: Certification[];
}

export function CertificationsForm({ certifications }: CertificationsFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Certification>();

  const onSubmit = async (data: Certification) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingId) {
        const { error } = await supabase
          .from("student_certifications")
          .update(data)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast({ title: "Certification updated successfully" });
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from("student_certifications")
          .insert({
            user_id: user.id,
            ...data,
            display_order: certifications.length,
          });

        if (error) throw error;
        toast({ title: "Certification added successfully" });
      }

      reset();
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ["studentCertifications"] });
    } catch (error: any) {
      toast({
        title: "Error saving certification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (cert: Certification) => {
    setEditingId(cert.id!);
    reset(cert);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("student_certifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Certification deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["studentCertifications"] });
    } catch (error: any) {
      toast({
        title: "Error deleting certification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    reset();
  };

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
        {certifications.map((cert) => (
          <div key={cert.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold">{cert.certification_name}</h4>
                <p className="text-sm text-muted-foreground">{cert.issuing_organization}</p>
                {cert.date_issued && (
                  <p className="text-sm text-muted-foreground">Issued: {cert.date_issued}</p>
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
                  placeholder="AWS Certified Cloud Practitioner"
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
                  placeholder="Amazon"
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="credential_url">Credential URL</Label>
                <Input
                  id="credential_url"
                  {...register("credential_url")}
                  placeholder="https://..."
                />
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

