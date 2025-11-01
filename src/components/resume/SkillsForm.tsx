import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Skill } from "@/hooks/useStudentProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface SkillsFormProps {
  skills: Skill[];
}

export function SkillsForm({ skills }: SkillsFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<Skill>();

  const onSubmit = async (data: Skill) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const skillsArray = (data.skills as any as string || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      const skillData = {
        category: selectedCategory || data.category,
        skills: skillsArray,
      };

      if (editingId) {
        const { error } = await supabase
          .from("student_skills")
          .update(skillData)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast({ title: "Skills updated successfully" });
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from("student_skills")
          .insert({
            user_id: user.id,
            ...skillData,
          });

        if (error) throw error;
        toast({ title: "Skills added successfully" });
      }

      reset();
      setSelectedCategory("");
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ["studentSkills"] });
    } catch (error: any) {
      toast({
        title: "Error saving skills",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (skill: Skill) => {
    setEditingId(skill.id!);
    setSelectedCategory(skill.category);
    reset({
      ...skill,
      skills: skill.skills?.join(", ") as any,
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("student_skills")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Skills deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["studentSkills"] });
    } catch (error: any) {
      toast({
        title: "Error deleting skills",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setSelectedCategory("");
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Skills</CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Skills
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing skills */}
        {skills.map((skill) => (
          <div key={skill.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold capitalize">{skill.category} Skills</h4>
                <div className="flex flex-wrap gap-1 mt-2">
                  {skill.skills?.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs bg-primary/10 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(skill)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(skill.id!)}
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
                {editingId ? "Edit Skills" : "Add New Skills"}
              </h4>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Skill Category *</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical Skills</SelectItem>
                    <SelectItem value="soft">Soft Skills</SelectItem>
                    <SelectItem value="languages">Languages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills *</Label>
                <Input
                  id="skills"
                  {...register("skills", { required: "Skills are required" })}
                  placeholder="Python, React, AWS (comma-separated)"
                />
                <p className="text-xs text-muted-foreground">
                  Separate skills with commas
                </p>
                {errors.skills && (
                  <p className="text-sm text-destructive">{errors.skills.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={!selectedCategory}>
                {editingId ? "Update Skills" : "Add Skills"}
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
