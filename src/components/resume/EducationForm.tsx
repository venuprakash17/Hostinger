import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Education } from "@/hooks/useStudentProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface EducationFormProps {
  education: Education[];
}

export function EducationForm({ education }: EducationFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<Education>();
  const isCurrentEducation = watch("is_current");

  const onSubmit = async (data: Education) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert YYYY-MM to YYYY-MM-01 for date fields
      const formattedData = {
        ...data,
        start_date: data.start_date ? `${data.start_date}-01` : null,
        end_date: data.end_date && !data.is_current ? `${data.end_date}-01` : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("student_education")
          .update(formattedData)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast({ title: "Education updated successfully" });
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from("student_education")
          .insert({
            user_id: user.id,
            ...formattedData,
            display_order: education.length,
          });

        if (error) throw error;
        toast({ title: "Education added successfully" });
      }

      reset({
        institution_name: '',
        degree: '',
        field_of_study: '',
        start_date: '',
        end_date: '',
        cgpa_percentage: '',
        relevant_coursework: '',
        is_current: false,
      });
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ["studentEducation"] });
    } catch (error: any) {
      toast({
        title: "Error saving education",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (edu: Education) => {
    setEditingId(edu.id!);
    // Format dates back to YYYY-MM for the month input
    const formattedEdu = {
      ...edu,
      start_date: edu.start_date ? edu.start_date.substring(0, 7) : undefined,
      end_date: edu.end_date ? edu.end_date.substring(0, 7) : undefined,
    };
    reset(formattedEdu);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("student_education")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Education deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["studentEducation"] });
    } catch (error: any) {
      toast({
        title: "Error deleting education",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    reset({
      institution_name: '',
      degree: '',
      field_of_study: '',
      start_date: '',
      end_date: '',
      cgpa_percentage: '',
      relevant_coursework: '',
      is_current: false,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Education</CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Education
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing education entries */}
        {education.map((edu) => (
          <div key={edu.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{edu.degree} - {edu.field_of_study}</h4>
                <p className="text-sm text-muted-foreground">{edu.institution_name}</p>
                <p className="text-sm text-muted-foreground">
                  {edu.start_date} - {edu.is_current ? "Present" : edu.end_date}
                </p>
                {edu.cgpa_percentage && (
                  <p className="text-sm">CGPA/Percentage: {edu.cgpa_percentage}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(edu)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(edu.id!)}
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
                {editingId ? "Edit Education" : "Add New Education"}
              </h4>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="institution_name">Institution Name *</Label>
                <Input
                  id="institution_name"
                  {...register("institution_name", { required: "Institution name is required" })}
                  placeholder="University Name"
                />
                {errors.institution_name && (
                  <p className="text-sm text-destructive">{errors.institution_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="degree">Degree *</Label>
                <Input
                  id="degree"
                  {...register("degree", { required: "Degree is required" })}
                  placeholder="B.Tech, B.Sc, M.A, etc."
                />
                {errors.degree && (
                  <p className="text-sm text-destructive">{errors.degree.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="field_of_study">Field of Study</Label>
                <Input
                  id="field_of_study"
                  {...register("field_of_study")}
                  placeholder="Computer Science, Economics, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="month"
                  {...register("start_date")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="month"
                  {...register("end_date")}
                  disabled={isCurrentEducation}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cgpa_percentage">CGPA / Percentage</Label>
                <Input
                  id="cgpa_percentage"
                  {...register("cgpa_percentage")}
                  placeholder="3.8 GPA or 85%"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relevant_coursework">Relevant Coursework</Label>
              <Textarea
                id="relevant_coursework"
                {...register("relevant_coursework")}
                placeholder="Data Structures, Algorithms, Database Systems"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_current"
                checked={isCurrentEducation}
                onCheckedChange={(checked) => setValue("is_current", checked as boolean)}
              />
              <Label htmlFor="is_current">Currently studying here</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update Education" : "Add Education"}
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
