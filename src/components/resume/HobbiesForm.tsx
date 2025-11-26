import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { resumeStorage } from "@/lib/resumeStorage";

interface Hobby {
  id?: string;
  hobby_name: string;
  description?: string;
  display_order?: number;
}

interface HobbiesFormProps {
  hobbies: Hobby[];
}

export function HobbiesForm({ hobbies }: HobbiesFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<Hobby>();
  const formValues = watch();

  // Load draft from localStorage when form opens
  useEffect(() => {
    if (isAdding && !editingId) {
      const draft = resumeStorage.load<Hobby>('hobbies_form');
      if (draft) {
        reset(draft);
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
        resumeStorage.save('hobbies_form', formValues);
      }
    }, 1000); // Save after 1 second of no typing

    return () => clearTimeout(timer);
  }, [formValues, isAdding, editingId]);

  const onSubmit = async (data: Hobby) => {
    try {
      // Clear draft after successful save
      resumeStorage.clear('hobbies_form');

      const hobbyData: Hobby = {
        ...data,
        id: editingId || `hobby_${Date.now()}`,
      };

      // Save to localStorage
      const savedHobbies = resumeStorage.load<Hobby[]>('hobbies_saved') || [];
      if (editingId) {
        const index = savedHobbies.findIndex((h: any) => h.id === editingId);
        if (index >= 0) {
          savedHobbies[index] = hobbyData;
        } else {
          savedHobbies.push(hobbyData);
        }
        toast({ title: "Hobby updated successfully" });
        setEditingId(null);
      } else {
        savedHobbies.push(hobbyData);
        toast({ title: "Hobby added successfully" });
      }
      
      resumeStorage.save('hobbies_saved', savedHobbies);

      reset();
      setIsAdding(false);
      
      // Trigger page refresh to show updated list
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error saving hobby",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (hobby: Hobby) => {
    setEditingId(hobby.id!);
    reset(hobby);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const savedHobbies = resumeStorage.load<Hobby[]>('hobbies_saved') || [];
      const filtered = savedHobbies.filter((h: any) => h.id !== id);
      resumeStorage.save('hobbies_saved', filtered);
      
      toast({ title: "Hobby deleted successfully" });
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error deleting hobby",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    // Clear draft when canceling
    resumeStorage.clear('hobbies_form');
    reset();
  };

  // Merge saved hobbies from localStorage with props
  const savedHobbies = resumeStorage.load<Hobby[]>('hobbies_saved') || [];
  const allHobbies = [...hobbies, ...savedHobbies.filter((h: any) => 
    !hobbies.find((hobby: any) => hobby.id === h.id)
  )];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Hobbies & Interests</CardTitle>
            <CardDescription>
              Optional: Add your hobbies and personal interests
            </CardDescription>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Hobby
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing hobbies */}
        {allHobbies.map((hobby) => (
          <div key={hobby.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold">{hobby.hobby_name}</h4>
                {hobby.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {hobby.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(hobby)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(hobby.id!)}
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
                {editingId ? "Edit Hobby" : "Add New Hobby"}
              </h4>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hobby_name">Hobby or Interest *</Label>
                <Input
                  id="hobby_name"
                  {...register("hobby_name", { required: "Hobby name is required" })}
                  placeholder="e.g., Photography, Chess, Reading, Traveling, Cooking, Blogging, Music"
                />
                {errors.hobby_name && (
                  <p className="text-sm text-destructive">{errors.hobby_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="e.g., Passionate photographer with 5 years of experience, published travel blog with 10k monthly readers"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">Optional: Briefly describe your interest or expertise level</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update Hobby" : "Add Hobby"}
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
