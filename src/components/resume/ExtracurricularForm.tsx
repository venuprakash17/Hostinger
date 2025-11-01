import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Extracurricular } from "@/hooks/useStudentProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ExtracurricularFormProps {
  extracurricular: Extracurricular[];
}

export function ExtracurricularForm({ extracurricular }: ExtracurricularFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Extracurricular>();

  const onSubmit = async (data: Extracurricular) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingId) {
        const { error } = await supabase
          .from("student_extracurricular")
          .update(data)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast({ title: "Activity updated successfully" });
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from("student_extracurricular")
          .insert({
            user_id: user.id,
            ...data,
            display_order: extracurricular.length,
          });

        if (error) throw error;
        toast({ title: "Activity added successfully" });
      }

      reset();
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ["studentExtracurricular"] });
    } catch (error: any) {
      toast({
        title: "Error saving activity",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (activity: Extracurricular) => {
    setEditingId(activity.id!);
    reset(activity);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("student_extracurricular")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Activity deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["studentExtracurricular"] });
    } catch (error: any) {
      toast({
        title: "Error deleting activity",
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
          <CardTitle>Extracurricular / Leadership</CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing activities */}
        {extracurricular.map((activity) => (
          <div key={activity.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold">{activity.activity_organization}</h4>
                {activity.role && (
                  <p className="text-sm text-muted-foreground">{activity.role}</p>
                )}
                {activity.duration_start && (
                  <p className="text-sm text-muted-foreground">
                    {activity.duration_start} - {activity.duration_end || "Present"}
                  </p>
                )}
                {activity.description && (
                  <p className="text-sm mt-2">{activity.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(activity)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(activity.id!)}
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
                {editingId ? "Edit Activity" : "Add New Activity"}
              </h4>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="activity_organization">Activity / Organization *</Label>
                <Input
                  id="activity_organization"
                  {...register("activity_organization", { required: "Activity/Organization is required" })}
                  placeholder="Coding Club President"
                />
                {errors.activity_organization && (
                  <p className="text-sm text-destructive">{errors.activity_organization.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="role">Role / Position</Label>
                <Input
                  id="role"
                  {...register("role")}
                  placeholder="President, Member, Volunteer, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_start">Start Date</Label>
                <Input
                  id="duration_start"
                  type="month"
                  {...register("duration_start")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_end">End Date</Label>
                <Input
                  id="duration_end"
                  type="month"
                  {...register("duration_end")}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="What you did or achieved"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update Activity" : "Add Activity"}
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
