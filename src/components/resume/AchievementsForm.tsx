import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Achievement } from "@/hooks/useStudentProfile";
import { useToast } from "@/hooks/use-toast";
import { resumeStorage } from "@/lib/resumeStorage";

interface AchievementsFormProps {
  achievements: Achievement[];
}

export function AchievementsForm({ achievements }: AchievementsFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<Achievement>();
  const formValues = watch();

  // Load draft from localStorage when form opens
  useEffect(() => {
    if (isAdding && !editingId) {
      const draft = resumeStorage.load<Achievement>('achievements_form');
      if (draft) {
        reset({
          ...draft,
          achievement_date: draft.achievement_date ? draft.achievement_date.substring(0, 7) : undefined,
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
        resumeStorage.save('achievements_form', formValues);
      }
    }, 1000); // Save after 1 second of no typing

    return () => clearTimeout(timer);
  }, [formValues, isAdding, editingId]);

  const onSubmit = async (data: Achievement) => {
    try {
      // Clear draft after successful save
      resumeStorage.clear('achievements_form');

      const achievementData: Achievement = {
        ...data,
        id: editingId || `achievement_${Date.now()}`,
        achievement_date: data.achievement_date ? `${data.achievement_date}-01` : null,
      };

      // Save to localStorage
      const savedAchievements = resumeStorage.load<Achievement[]>('achievements_saved') || [];
      if (editingId) {
        const index = savedAchievements.findIndex((a: any) => a.id === editingId);
        if (index >= 0) {
          savedAchievements[index] = achievementData;
        } else {
          savedAchievements.push(achievementData);
        }
        toast({ title: "Achievement updated successfully" });
        setEditingId(null);
      } else {
        savedAchievements.push(achievementData);
        toast({ title: "Achievement added successfully" });
      }
      
      resumeStorage.save('achievements_saved', savedAchievements);

      reset();
      setIsAdding(false);
      
      // Trigger page refresh to show updated list
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error saving achievement",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (achievement: Achievement) => {
    setEditingId(achievement.id!);
    reset({
      ...achievement,
      achievement_date: achievement.achievement_date ? achievement.achievement_date.substring(0, 7) : undefined,
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const savedAchievements = resumeStorage.load<Achievement[]>('achievements_saved') || [];
      const filtered = savedAchievements.filter((a: any) => a.id !== id);
      resumeStorage.save('achievements_saved', filtered);
      
      toast({ title: "Achievement deleted successfully" });
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error deleting achievement",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    // Clear draft when canceling
    resumeStorage.clear('achievements_form');
    reset();
  };

  // Merge saved achievements from localStorage with props
  const savedAchievements = resumeStorage.load<Achievement[]>('achievements_saved') || [];
  const allAchievements = [...achievements, ...savedAchievements.filter((a: any) => 
    !achievements.find((ach: any) => ach.id === a.id)
  )];

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
        {allAchievements.map((achievement) => (
          <div key={achievement.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold">{achievement.title}</h4>
                {achievement.issuing_body && (
                  <p className="text-sm text-muted-foreground">{achievement.issuing_body}</p>
                )}
                {achievement.achievement_date && (
                  <p className="text-sm text-muted-foreground">{achievement.achievement_date.substring(0, 7)}</p>
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
                  placeholder="e.g., Hackathon Winner, Dean's List, Best Presentation Award, Leadership Excellence Award"
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
                  placeholder="e.g., Google Developer Student Club, IEEE, ACM, National Science Foundation"
                />
                <p className="text-xs text-muted-foreground">Optional: Organization that issued the award</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="achievement_date">Date</Label>
                <Input
                  id="achievement_date"
                  type="month"
                  {...register("achievement_date")}
                />
                <p className="text-xs text-muted-foreground">Optional: When you received this achievement</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="e.g., Won first place in a 48-hour hackathon with over 200 participants. Developed an AI-powered solution that reduced processing time by 60%."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Optional: Describe the achievement and its impact</p>
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
