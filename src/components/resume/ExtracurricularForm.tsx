import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Extracurricular } from "@/hooks/useStudentProfile";
import { useToast } from "@/hooks/use-toast";
import { resumeStorage } from "@/lib/resumeStorage";

interface ExtracurricularFormProps {
  extracurricular: Extracurricular[];
}

export function ExtracurricularForm({ extracurricular }: ExtracurricularFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<Extracurricular>();
  const formValues = watch();

  // Load draft from localStorage when form opens
  useEffect(() => {
    if (isAdding && !editingId) {
      const draft = resumeStorage.load<Extracurricular>('extracurricular_form');
      if (draft) {
        reset({
          ...draft,
          duration_start: draft.duration_start ? draft.duration_start.substring(0, 7) : undefined,
          duration_end: draft.duration_end ? draft.duration_end.substring(0, 7) : undefined,
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
        resumeStorage.save('extracurricular_form', formValues);
      }
    }, 1000); // Save after 1 second of no typing

    return () => clearTimeout(timer);
  }, [formValues, isAdding, editingId]);

  const onSubmit = async (data: Extracurricular) => {
    try {
      // Clear draft after successful save
      resumeStorage.clear('extracurricular_form');

      const activityData: Extracurricular = {
        ...data,
        id: editingId || `extra_${Date.now()}`,
        duration_start: data.duration_start ? `${data.duration_start}-01` : null,
        duration_end: data.duration_end ? `${data.duration_end}-01` : null,
      };

      // Save to localStorage
      const savedActivities = resumeStorage.load<Extracurricular[]>('extracurricular_saved') || [];
      if (editingId) {
        const index = savedActivities.findIndex((a: any) => a.id === editingId);
        if (index >= 0) {
          savedActivities[index] = activityData;
        } else {
          savedActivities.push(activityData);
        }
        toast({ title: "Activity updated successfully" });
        setEditingId(null);
      } else {
        savedActivities.push(activityData);
        toast({ title: "Activity added successfully" });
      }
      
      resumeStorage.save('extracurricular_saved', savedActivities);

      reset();
      setIsAdding(false);
      
      // Trigger page refresh to show updated list
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error saving activity",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (activity: Extracurricular) => {
    setEditingId(activity.id!);
    reset({
      ...activity,
      duration_start: activity.duration_start ? activity.duration_start.substring(0, 7) : undefined,
      duration_end: activity.duration_end ? activity.duration_end.substring(0, 7) : undefined,
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const savedActivities = resumeStorage.load<Extracurricular[]>('extracurricular_saved') || [];
      const filtered = savedActivities.filter((a: any) => a.id !== id);
      resumeStorage.save('extracurricular_saved', filtered);
      
      toast({ title: "Activity deleted successfully" });
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error deleting activity",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    // Clear draft when canceling
    resumeStorage.clear('extracurricular_form');
    reset();
  };

  // Merge saved activities from localStorage with props
  const savedActivities = resumeStorage.load<Extracurricular[]>('extracurricular_saved') || [];
  const allActivities = [...extracurricular, ...savedActivities.filter((a: any) => 
    !extracurricular.find((act: any) => act.id === a.id)
  )];

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
        {allActivities.map((activity) => (
          <div key={activity.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold">{activity.activity_organization}</h4>
                {activity.role && (
                  <p className="text-sm text-muted-foreground">{activity.role}</p>
                )}
                {activity.duration_start && (
                  <p className="text-sm text-muted-foreground">
                    {activity.duration_start.substring(0, 7)} - {activity.duration_end ? activity.duration_end.substring(0, 7) : "Present"}
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
                  placeholder="e.g., Coding Club, Student Council, Debate Team, Sports Team, Volunteer Organization"
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
                  placeholder="e.g., President, Vice President, Secretary, Team Lead, Member, Volunteer, Organizer"
                />
                <p className="text-xs text-muted-foreground">Optional: Your position or role in this activity</p>
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
                <p className="text-xs text-muted-foreground">Leave empty if currently active</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="e.g., Organized monthly coding workshops, led a team of 15 members, managed events with 200+ participants, raised $5,000 for charity"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Optional: Describe your involvement and achievements</p>
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
