import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Achievement } from "@/hooks/useStudentProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AchievementsFormProps {
  achievements: Achievement[];
}

export function AchievementsForm({ achievements }: AchievementsFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Achievement>();

  const onSubmit = async (data: Achievement) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingId) {
        const { error } = await supabase
          .from("student_achievements")
          .update(data)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast({ title: "Achievement updated successfully" });
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from("student_achievements")
          .insert({
            user_id: user.id,
            ...data,
            display_order: achievements.length,
          });

        if (error) throw error;
        toast({ title: "Achievement added successfully" });
      }

      reset();
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ["studentAchievements"] });
    } catch (error: any) {
      toast({
        title: "Error saving achievement",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (achievement: Achievement) => {
    setEditingId(achievement.id!);
    reset(achievement);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("student_achievements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Achievement deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["studentAchievements"] });
    } catch (error: any) {
      toast({
        title: "Error deleting achievement",
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
          <CardTitle>Achievements / Awards</CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Achievement
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing achievements */}
        {achievements.map((achievement) => (
          <div key={achievement.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold">{achievement.title}</h4>
                {achievement.issuing_body && (
                  <p className="text-sm text-muted-foreground">{achievement.issuing_body}</p>
                )}
                {achievement.achievement_date && (
                  <p className="text-sm text-muted-foreground">{achievement.achievement_date}</p>
                )}
                {achievement.description && (
                  <p className="text-sm mt-2">{achievement.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(achievement)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(achievement.id!)}
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
                {editingId ? "Edit Achievement" : "Add New Achievement"}
              </h4>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Achievement Title *</Label>
                <Input
                  id="title"
                  {...register("title", { required: "Title is required" })}
                  placeholder="Hackathon Winner"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="issuing_body">Issuing Body</Label>
                <Input
                  id="issuing_body"
                  {...register("issuing_body")}
                  placeholder="Google Developer Student Club"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="achievement_date">Date</Label>
                <Input
                  id="achievement_date"
                  type="month"
                  {...register("achievement_date")}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Brief description of the achievement"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update Achievement" : "Add Achievement"}
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
